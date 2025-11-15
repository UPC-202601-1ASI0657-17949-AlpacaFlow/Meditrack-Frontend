import {Component, computed, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RelativesStore} from "../../../application/relatives.store";
import {MatList, MatListItem} from "@angular/material/list";
import {MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle} from "@angular/material/card";
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
    standalone: true,
    imports: [
        MatListItem,
        MatList,
        MatCardContent,
        MatCardSubtitle,
        MatCardTitle,
        MatCardHeader,
        MatCard,
        TranslatePipe,
    ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
    private relativesStore = inject(RelativesStore);
    private route = inject(ActivatedRoute);

    relative = computed(() => this.relativesStore.selectedRelative());

    ngOnInit() {
        const relativeId = this.route.snapshot.parent?.params['id'];
        if (relativeId) {
            const id = parseInt(relativeId, 10);
            if (id) {
                this.relativesStore.loadRelativeById(id);
            }
        }
    }
}
